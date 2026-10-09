// Field group browser contract, executed through Chrome DevTools MCP `evaluate_script`.
const nonZero = (value) => parseFloat(value) > 0;
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const settle = async (...elements) => {
  for (let i = 0; i < 3; i++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await frame();
  }
};
/** The public boundary a member exposes to the group (Input group root or Input root). */
const boundary = (member) =>
  member.shadowRoot.querySelector('[part~="input-group"], [part~="input"]');
/** The group registers its alias as a presentation-part token on the member boundary. */
const aliased = (element, alias) =>
  (element.getAttribute('data-tp-presentation-part') ?? '')
    .split(/\s+/)
    .some((token) => token.endsWith(`-${alias}`));
const editor = (marker, label, value) => {
  const group = document.createElement('tp-input-group');
  const prefix = document.createElement('span');
  prefix.slot = 'prefix';
  prefix.textContent = marker;
  const input = document.createElement('tp-input');
  input.label = label;
  input.defaultValue = value;
  group.append(prefix, input);
  return group;
};
const fail = (name, result) => {
  const failed = Object.entries(result).filter(([, value]) => value !== true);
  if (failed.length)
    throw new Error(
      `${name} failed: ${failed.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ')}`,
    );
  return result;
};

/** Joined corners and seams, equal sizing, naming, aliases, vertical, unjoined and membership. */
export async function run() {
  const host = document.querySelector('#host');
  host.replaceChildren();
  const group = document.createElement('tp-field-group');
  group.label = 'Contract size';
  const members = [
    editor('W', 'Width', '1280'),
    editor('H', 'Height', '720'),
    editor('D', 'Depth', '1'),
  ];
  group.append(...members);
  host.append(group);
  await settle(group, ...members);
  const root = group.shadowRoot.querySelector('[part~="field-group"]');
  const boxes = () => members.map((member) => boundary(member).getBoundingClientRect());
  const styles = () => members.map((member) => getComputedStyle(boundary(member)));
  let s = styles();
  let b = boxes();
  const horizontalCorners =
    nonZero(s[0].borderTopLeftRadius) &&
    !nonZero(s[0].borderTopRightRadius) &&
    !nonZero(s[1].borderTopLeftRadius) &&
    !nonZero(s[1].borderTopRightRadius) &&
    !nonZero(s[2].borderTopLeftRadius) &&
    nonZero(s[2].borderTopRightRadius);
  const horizontalSeams =
    s[1].borderLeftWidth === '0px' &&
    s[2].borderLeftWidth === '0px' &&
    nonZero(s[0].borderLeftWidth) &&
    Math.abs(b[0].right - b[1].left) < 0.1 &&
    Math.abs(b[1].right - b[2].left) < 0.1;
  const equalShare = Math.abs(b[0].width - b[1].width) < 1 && Math.abs(b[1].width - b[2].width) < 1;
  const named = root.getAttribute('role') === 'group' && root.ariaLabel === 'Contract size';
  const aliasRegistered = members.every((member) =>
    aliased(boundary(member), 'field-group-control'),
  );
  const inputs = members.map((member) => member.querySelector('tp-input'));
  inputs[1].setValue('640');
  await settle(...inputs);
  const valuesIndependent =
    inputs[0].value === '1280' && inputs[1].value === '640' && inputs[2].value === '1';

  group.orientation = 'vertical';
  await settle(group, ...members);
  s = styles();
  b = boxes();
  const verticalCorners =
    nonZero(s[0].borderTopLeftRadius) &&
    nonZero(s[0].borderTopRightRadius) &&
    !nonZero(s[0].borderBottomLeftRadius) &&
    !nonZero(s[1].borderTopLeftRadius) &&
    !nonZero(s[1].borderBottomLeftRadius) &&
    nonZero(s[2].borderBottomLeftRadius) &&
    nonZero(s[2].borderBottomRightRadius);
  const verticalSeams =
    s[1].borderTopWidth === '0px' &&
    s[2].borderTopWidth === '0px' &&
    Math.abs(b[0].bottom - b[1].top) < 0.1 &&
    Math.abs(b[1].bottom - b[2].top) < 0.1 &&
    Math.abs(b[0].width - b[2].width) < 1;
  const orderKept = [...group.children].every((child, index) => child === members[index]);

  group.orientation = 'horizontal';
  group.joined = false;
  await settle(group, ...members);
  s = styles();
  b = boxes();
  const unjoined =
    nonZero(s[1].borderTopLeftRadius) &&
    nonZero(s[1].borderTopRightRadius) &&
    nonZero(s[1].borderLeftWidth) &&
    b[1].left - b[0].right > 1 &&
    nonZero(getComputedStyle(root).columnGap);

  group.joined = true;
  host.append(members[1]);
  await settle(group, ...members);
  const afterRemoval = [members[0], members[2]].map((member) => getComputedStyle(boundary(member)));
  const standalone = getComputedStyle(boundary(members[1]));
  const membershipUpdates =
    nonZero(afterRemoval[0].borderTopLeftRadius) &&
    !nonZero(afterRemoval[0].borderTopRightRadius) &&
    !nonZero(afterRemoval[1].borderTopLeftRadius) &&
    nonZero(afterRemoval[1].borderTopRightRadius) &&
    afterRemoval[1].borderLeftWidth === '0px' &&
    nonZero(standalone.borderTopLeftRadius) &&
    nonZero(standalone.borderTopRightRadius) &&
    nonZero(standalone.borderLeftWidth) &&
    !aliased(boundary(members[1]), 'field-group-control');

  return fail('field group contract', {
    horizontalCorners,
    horizontalSeams,
    equalShare,
    named,
    aliasRegistered,
    valuesIndependent,
    verticalCorners,
    verticalSeams,
    orderKept,
    unjoined,
    membershipUpdates,
  });
}

/** Geometry of a fixture group: member boundary boxes, radii and seam borders. */
export function geometry(id) {
  const group = document.querySelector(`#${id}`);
  return [...group.children]
    .filter((child) => child.shadowRoot)
    .map((member) => {
      const element = boundary(member) ?? member;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        tag: member.localName,
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10,
        left: Math.round(box.left * 10) / 10,
        radii: [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomRightRadius,
          style.borderBottomLeftRadius,
        ],
        borders: [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth,
        ],
        part: element.getAttribute('part'),
      };
    });
}
