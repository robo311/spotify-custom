// macOS capture: a Core Audio process tap (macOS 14.2+) on Spotify's audio process, read through a private
// aggregate device. The realtime IO proc only mixes to mono into a lock-free ring; Go drains it.
#import <Foundation/Foundation.h>
#import <CoreAudio/CoreAudio.h>
#import <CoreAudio/CATapDescription.h>
#import <CoreAudio/AudioHardwareTapping.h>
#include <stdatomic.h>
#include <stdlib.h>
#include <string.h>
#include "capture_darwin.h"

#define RING (1 << 16) // samples; ~1.4 s at 48 kHz, far more than one drain interval

struct sc_tap {
	AudioObjectID tap, agg;
	AudioDeviceIOProcID proc;
	int rate, latency_ms;
	_Atomic uint64_t w, r;
	float ring[RING];
};

static AudioObjectPropertyAddress addr(AudioObjectPropertySelector sel, AudioObjectPropertyScope scope) {
	AudioObjectPropertyAddress a = {sel, scope, kAudioObjectPropertyElementMain};
	return a;
}

static OSStatus get(AudioObjectID obj, AudioObjectPropertySelector sel, AudioObjectPropertyScope scope, UInt32 size, void *out) {
	AudioObjectPropertyAddress a = addr(sel, scope);
	return AudioObjectGetPropertyData(obj, &a, 0, NULL, &size, out);
}

static UInt32 get_u32(AudioObjectID obj, AudioObjectPropertySelector sel, AudioObjectPropertyScope scope) {
	UInt32 v = 0;
	get(obj, sel, scope, sizeof v, &v);
	return v;
}

// The audio process object for bundle_id (preferring one that is playing), else the one for pid.
static AudioObjectID find_process(const char *bundle_id, int pid) {
	AudioObjectPropertyAddress a = addr(kAudioHardwarePropertyProcessObjectList, kAudioObjectPropertyScopeGlobal);
	UInt32 size = 0;
	AudioObjectID found = kAudioObjectUnknown;
	if (AudioObjectGetPropertyDataSize(kAudioObjectSystemObject, &a, 0, NULL, &size) == noErr && size > 0) {
		AudioObjectID *ids = malloc(size);
		if (ids && AudioObjectGetPropertyData(kAudioObjectSystemObject, &a, 0, NULL, &size, ids) == noErr) {
			NSString *want = [NSString stringWithUTF8String:bundle_id];
			for (UInt32 i = 0; i < size / sizeof(AudioObjectID); i++) {
				CFStringRef bid = NULL;
				if (get(ids[i], kAudioProcessPropertyBundleID, kAudioObjectPropertyScopeGlobal, sizeof bid, &bid) != noErr || !bid) continue;
				BOOL match = [want isEqualToString:(__bridge NSString *)bid];
				CFRelease(bid);
				if (!match) continue;
				if (found == kAudioObjectUnknown || get_u32(ids[i], kAudioProcessPropertyIsRunningOutput, kAudioObjectPropertyScopeGlobal)) {
					found = ids[i];
				}
			}
		}
		free(ids);
	}
	if (found == kAudioObjectUnknown && pid > 0) {
		AudioObjectPropertyAddress t = addr(kAudioHardwarePropertyTranslatePIDToProcessObject, kAudioObjectPropertyScopeGlobal);
		pid_t p = pid;
		UInt32 sz = sizeof found;
		if (AudioObjectGetPropertyData(kAudioObjectSystemObject, &t, sizeof p, &p, &sz, &found) != noErr) found = kAudioObjectUnknown;
	}
	return found;
}

// Total output latency of the default output device: device + safety offset + buffer + stream, in ms.
static int output_latency_ms(AudioObjectID dev) {
	Float64 rate = 0;
	if (get(dev, kAudioDevicePropertyNominalSampleRate, kAudioObjectPropertyScopeGlobal, sizeof rate, &rate) != noErr || rate <= 0) return 0;
	UInt32 frames = get_u32(dev, kAudioDevicePropertyLatency, kAudioObjectPropertyScopeOutput) +
		get_u32(dev, kAudioDevicePropertySafetyOffset, kAudioObjectPropertyScopeOutput) +
		get_u32(dev, kAudioDevicePropertyBufferFrameSize, kAudioObjectPropertyScopeGlobal);
	AudioObjectID stream = kAudioObjectUnknown;
	if (get(dev, kAudioDevicePropertyStreams, kAudioObjectPropertyScopeOutput, sizeof stream, &stream) == noErr && stream != kAudioObjectUnknown) {
		frames += get_u32(stream, kAudioStreamPropertyLatency, kAudioObjectPropertyScopeGlobal);
	}
	return (int)(frames / rate * 1000.0 + 0.5);
}

static OSStatus io_proc(AudioObjectID dev, const AudioTimeStamp *now, const AudioBufferList *in, const AudioTimeStamp *in_time,
                        AudioBufferList *out, const AudioTimeStamp *out_time, void *ctx) {
	sc_tap *t = ctx;
	if (!in || in->mNumberBuffers == 0) return noErr;
	const AudioBuffer *first = &in->mBuffers[0];
	UInt32 ch0 = first->mNumberChannels ? first->mNumberChannels : 1;
	UInt32 frames = first->mDataByteSize / (UInt32)(sizeof(float) * ch0);
	uint64_t w = atomic_load_explicit(&t->w, memory_order_relaxed);
	for (UInt32 f = 0; f < frames; f++) {
		float sum = 0;
		UInt32 n = 0;
		for (UInt32 b = 0; b < in->mNumberBuffers; b++) { // interleaved (one buffer) or one buffer per channel
			const AudioBuffer *buf = &in->mBuffers[b];
			UInt32 ch = buf->mNumberChannels ? buf->mNumberChannels : 1;
			if (!buf->mData || buf->mDataByteSize < (f + 1) * ch * sizeof(float)) continue;
			const float *d = buf->mData;
			for (UInt32 c = 0; c < ch; c++) sum += d[f * ch + c];
			n += ch;
		}
		t->ring[w & (RING - 1)] = n ? sum / (float)n : 0;
		w++;
	}
	atomic_store_explicit(&t->w, w, memory_order_release);
	return noErr;
}

static int fail(sc_tap *t, const char *what, OSStatus st, int32_t *os_status, char *step, int step_len) {
	*os_status = st;
	strncpy(step, what, step_len - 1);
	step[step_len - 1] = 0;
	sc_tap_stop(t);
	return SC_TAP_FAILED;
}

static int start_tap(const char *bundle_id, int pid, sc_tap **out, int32_t *os_status, char *step, int step_len) API_AVAILABLE(macos(14.2)) {
	AudioObjectID process = find_process(bundle_id, pid);
	if (process == kAudioObjectUnknown) return SC_TAP_NO_PROCESS;

	sc_tap *t = calloc(1, sizeof *t);
	if (!t) return fail(NULL, "allocate", -1, os_status, step, step_len);
	@autoreleasepool {
		CATapDescription *desc = [[CATapDescription alloc] initStereoMixdownOfProcesses:@[ @(process) ]];
		desc.name = @"Spotify Custom";
		desc.privateTap = YES;
		desc.muteBehavior = CATapUnmuted;
		OSStatus st = AudioHardwareCreateProcessTap(desc, &t->tap);
		if (st != noErr) return fail(t, "create tap", st, os_status, step, step_len);

		AudioStreamBasicDescription fmt = {0};
		st = get(t->tap, kAudioTapPropertyFormat, kAudioObjectPropertyScopeGlobal, sizeof fmt, &fmt);
		if (st != noErr) return fail(t, "read tap format", st, os_status, step, step_len);
		if (fmt.mFormatID != kAudioFormatLinearPCM || !(fmt.mFormatFlags & kAudioFormatFlagIsFloat) || fmt.mBitsPerChannel != 32) {
			return fail(t, "tap format is not 32-bit float", 0, os_status, step, step_len);
		}
		t->rate = (int)fmt.mSampleRate;

		AudioObjectID output = kAudioObjectUnknown;
		st = get(kAudioObjectSystemObject, kAudioHardwarePropertyDefaultOutputDevice, kAudioObjectPropertyScopeGlobal, sizeof output, &output);
		if (st != noErr || output == kAudioObjectUnknown) return fail(t, "find output device", st, os_status, step, step_len);
		CFStringRef outputUID = NULL;
		st = get(output, kAudioDevicePropertyDeviceUID, kAudioObjectPropertyScopeGlobal, sizeof outputUID, &outputUID);
		if (st != noErr || !outputUID) return fail(t, "read output device id", st, os_status, step, step_len);
		t->latency_ms = output_latency_ms(output);

		NSString *outUID = (__bridge_transfer NSString *)outputUID;
		NSDictionary *aggregate = @{
			@kAudioAggregateDeviceNameKey : @"Spotify Custom",
			@kAudioAggregateDeviceUIDKey : [[NSUUID UUID] UUIDString],
			@kAudioAggregateDeviceMainSubDeviceKey : outUID,
			@kAudioAggregateDeviceIsPrivateKey : @YES,
			@kAudioAggregateDeviceIsStackedKey : @NO,
			@kAudioAggregateDeviceTapAutoStartKey : @YES,
			@kAudioAggregateDeviceSubDeviceListKey : @[ @{@kAudioSubDeviceUIDKey : outUID} ],
			@kAudioAggregateDeviceTapListKey : @[ @{@kAudioSubTapDriftCompensationKey : @YES, @kAudioSubTapUIDKey : desc.UUID.UUIDString} ],
		};
		st = AudioHardwareCreateAggregateDevice((__bridge CFDictionaryRef)aggregate, &t->agg);
		if (st != noErr) return fail(t, "create aggregate device", st, os_status, step, step_len);
		st = AudioDeviceCreateIOProcID(t->agg, io_proc, t, &t->proc);
		if (st != noErr) return fail(t, "create io proc", st, os_status, step, step_len);
		st = AudioDeviceStart(t->agg, t->proc);
		if (st != noErr) return fail(t, "start device", st, os_status, step, step_len);
	}
	*out = t;
	return SC_TAP_OK;
}

int sc_tap_start(const char *bundle_id, int pid, sc_tap **out, int32_t *os_status, char *step, int step_len) {
	*out = NULL;
	if (@available(macOS 14.2, *)) return start_tap(bundle_id, pid, out, os_status, step, step_len);
	return SC_TAP_UNSUPPORTED;
}

int sc_tap_read(sc_tap *t, float *out, int max) {
	uint64_t w = atomic_load_explicit(&t->w, memory_order_acquire);
	uint64_t r = atomic_load_explicit(&t->r, memory_order_relaxed);
	if (w - r > RING) r = w - RING; // overrun: keep the newest
	int n = 0;
	for (; r < w && n < max; r++, n++) out[n] = t->ring[r & (RING - 1)];
	atomic_store_explicit(&t->r, r, memory_order_relaxed);
	return n;
}

int sc_tap_sample_rate(sc_tap *t) { return t->rate; }
int sc_tap_latency_ms(sc_tap *t) { return t->latency_ms; }

void sc_tap_stop(sc_tap *t) {
	if (!t) return;
	if (t->agg != kAudioObjectUnknown) {
		if (t->proc) {
			AudioDeviceStop(t->agg, t->proc);
			AudioDeviceDestroyIOProcID(t->agg, t->proc);
		}
		AudioHardwareDestroyAggregateDevice(t->agg);
	}
	if (t->tap != kAudioObjectUnknown) {
		if (@available(macOS 14.2, *)) AudioHardwareDestroyProcessTap(t->tap);
	}
	free(t);
}
