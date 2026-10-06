// C interface of the macOS process tap (capture_darwin.m), used by capture_darwin.go.
#include <stdint.h>

typedef struct sc_tap sc_tap;

enum { SC_TAP_OK = 0, SC_TAP_UNSUPPORTED = 1, SC_TAP_NO_PROCESS = 2, SC_TAP_FAILED = 3 };

// Starts tapping the audio process with bundle_id (falling back to pid). On SC_TAP_FAILED, step names what
// failed and os_status holds Core Audio's error.
int sc_tap_start(const char *bundle_id, int pid, sc_tap **out, int32_t *os_status, char *step, int step_len);
// Copies up to max captured mono samples into out; returns how many.
int sc_tap_read(sc_tap *t, float *out, int max);
int sc_tap_sample_rate(sc_tap *t);
int sc_tap_latency_ms(sc_tap *t);
// Stops the IO proc and destroys the aggregate device and the tap.
void sc_tap_stop(sc_tap *t);
