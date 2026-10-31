// Type tests of the React bindings as an application writes them; `npm run typecheck` compiles
// them. Each `@ts-expect-error` is a misuse the bindings must reject.
import { useState, type ReactElement } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  Input,
  Menu,
  MenuItem,
  Select,
  TreeView,
} from '../../../src/react/index.js';
import type { TpSelect } from '../../../src/components/select/select.js';
import { boldIcon } from '../../../src/icons/text-formatting.js';

export function LayerPanel(): ReactElement {
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState('');
  const [fruit, setFruit] = useState<unknown>('apple');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" icon={boldIcon} className="wide" onClick={() => setOpen(true)}>
        Rename
      </Button>
      {/* A lane callback is typed by the element: `detail.value` is a boolean. */}
      <Checkbox checked={checked} onCheckedChange={(event) => setChecked(event.detail.value)} />
      <Input value={name} onValueChange={(event) => setName(event.detail.value.trim())} />
      <Select
        items={[{ value: 'apple', label: 'Apple' }]}
        value={fruit}
        onValueChange={(event) => setFruit(event.detail.value)}
        onTpOpenChangeComplete={(event) => {
          const opened: boolean = event.detail.open;
          return opened;
        }}
        ref={(element: TpSelect | null) => void element}
      />
      <Dialog
        open={open}
        onOpenChange={(event) => setOpen(event.detail.value)}
        label="Rename layer"
      >
        <Button slot="trigger">Rename</Button>
        <p>Body</p>
      </Dialog>
      <Menu onTpAction={(event) => console.info(event.detail.value, event.detail.item.label)}>
        <Button slot="trigger">Layer</Button>
        <MenuItem value="duplicate">Duplicate</MenuItem>
      </Menu>
      <TreeView<{ id: string; label: string }> data-testid="tree" />
    </>
  );
}

export const misuses: ReactElement[] = [
  // @ts-expect-error `variant` is one of the Button variants.
  <Button variant="huge" />,
  // @ts-expect-error a Checkbox lane callback receives a boolean value, not a string.
  <Checkbox onCheckedChange={(event) => event.detail.value.toUpperCase()} />,
  // @ts-expect-error events are typed: tp-open-change-complete has no `value`.
  <Dialog onTpOpenChangeComplete={(event) => event.detail.value} />,
  // @ts-expect-error unknown props are rejected.
  <Input notAProp />,
];
