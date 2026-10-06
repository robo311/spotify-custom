// The round handle shared by the field and the hue strip: crisp white ring, soft shadow, grows while dragged.
import { css } from '../../styles/sheet'

export const handleStyles = css`
  .b-handle {
    position: absolute;
    width: 14px;
    height: 14px;
    margin: -7px 0 0 -7px;
    border-radius: 50%;
    background: var(--c);
    box-shadow:
      0 0 0 2px #fff,
      0 0 0 3px rgb(0 0 0 / 0.12),
      0 2px 6px rgb(0 0 0 / 0.35);
    pointer-events: none;
    transition: transform 120ms var(--b-ease);
  }
  .b-handle[data-active='true'] {
    transform: scale(1.22);
  }
`
