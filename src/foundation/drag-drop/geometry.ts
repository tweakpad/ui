/** Source: dnd-kit geometry/{point,shapes,position} at e522d9c6a3cbe39e6e980ee3b6fd7a78f238ab94.
 * MIT, see LICENSE.dnd-kit. A22 replaces signal history; invalid numeric samples
 * are rejected before publication and zero elapsed time produces zero velocity.
 */
export interface Coordinates {
  x: number;
  y: number;
}
export interface BoundingRectangle {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface Alignment {
  x: 'start' | 'center' | 'end';
  y: 'start' | 'center' | 'end';
}

export function validCoordinates(value: Coordinates): boolean {
  return Number.isFinite(value?.x) && Number.isFinite(value?.y);
}

export function validRectangle(value: BoundingRectangle, measurable = false): boolean {
  return (
    [value.left, value.top, value.width, value.height].every(Number.isFinite) &&
    (measurable ? value.width > 0 && value.height > 0 : value.width >= 0 && value.height >= 0)
  );
}

export class Point implements Coordinates {
  constructor(
    public x: number,
    public y: number,
  ) {
    if (!validCoordinates(this)) throw new TypeError('Drag coordinates must be finite.');
  }
  static delta(a: Coordinates, b: Coordinates): Point {
    return new Point(a.x - b.x, a.y - b.y);
  }
  static distance(a: Coordinates, b: Coordinates): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  static equals(a: Coordinates, b: Coordinates): boolean {
    return a.x === b.x && a.y === b.y;
  }
  static from({ x, y }: Coordinates): Point {
    return new Point(x, y);
  }
}

export class Rectangle implements BoundingRectangle {
  scale = { x: 1, y: 1 };
  constructor(
    public left: number,
    public top: number,
    public width: number,
    public height: number,
  ) {
    if (!validRectangle(this))
      throw new TypeError('Drag rectangles require finite coordinates and nonnegative dimensions.');
  }
  get inverseScale(): Coordinates {
    return { x: 1 / this.scale.x, y: 1 / this.scale.y };
  }
  translate(x: number, y: number): Rectangle {
    const result = new Rectangle(this.left + x, this.top + y, this.width, this.height);
    result.scale = { ...this.scale };
    return result;
  }
  get boundingRectangle() {
    return {
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      right: this.right,
      bottom: this.bottom,
    };
  }
  get center(): Point {
    return new Point((this.left + this.right) / 2, (this.top + this.bottom) / 2);
  }
  get area(): number {
    return this.width * this.height;
  }
  get right(): number {
    return this.left + this.width;
  }
  get bottom(): number {
    return this.top + this.height;
  }
  get aspectRatio(): number {
    return this.width / this.height;
  }
  get corners(): Coordinates[] {
    return [
      { x: this.left, y: this.top },
      { x: this.right, y: this.top },
      { x: this.left, y: this.bottom },
      { x: this.right, y: this.bottom },
    ];
  }
  equals(shape: BoundingRectangle): boolean {
    return (
      this.left === shape.left &&
      this.top === shape.top &&
      this.width === shape.width &&
      this.height === shape.height
    );
  }
  containsPoint(point: Coordinates): boolean {
    return (
      this.top <= point.y && point.y <= this.bottom && this.left <= point.x && point.x <= this.right
    );
  }
  intersectionArea(shape: BoundingRectangle): number {
    const top = Math.max(shape.top, this.top);
    const left = Math.max(shape.left, this.left);
    const right = Math.min(shape.left + shape.width, this.right);
    const bottom = Math.min(shape.top + shape.height, this.bottom);
    return left < right && top < bottom ? (right - left) * (bottom - top) : 0;
  }
  intersectionRatio(shape: BoundingRectangle): number {
    const intersection = this.intersectionArea(shape);
    const union = shape.width * shape.height + this.area - intersection;
    return union > 0 ? intersection / union : 0;
  }
  static from(rect: BoundingRectangle): Rectangle {
    return new Rectangle(rect.left, rect.top, rect.width, rect.height);
  }
  static delta(
    a: BoundingRectangle,
    b: BoundingRectangle,
    alignment: Alignment = { x: 'center', y: 'center' },
  ): Point {
    const coordinate = (rect: BoundingRectangle, axis: 'x' | 'y') => {
      const start = axis === 'x' ? rect.left : rect.top;
      const size = axis === 'x' ? rect.width : rect.height;
      return (
        start + (alignment[axis] === 'start' ? 0 : alignment[axis] === 'end' ? size : size / 2)
      );
    };
    return Point.delta(
      { x: coordinate(a, 'x'), y: coordinate(a, 'y') },
      { x: coordinate(b, 'x'), y: coordinate(b, 'y') },
    );
  }
  static intersectionRatio(a: BoundingRectangle, b: BoundingRectangle): number {
    return Rectangle.from(a).intersectionRatio(b);
  }
}

export class Position {
  initial: Point;
  previous: Point | undefined;
  #current: Point;
  #timestamp = 0;
  velocity: Coordinates = { x: 0, y: 0 };
  constructor(private readonly defaultValue: Coordinates) {
    this.initial = this.#current = Point.from(defaultValue);
  }
  get current(): Point {
    return this.#current;
  }
  set current(value: Coordinates) {
    this.set(value);
  }
  set(value: Coordinates, timestamp = Date.now()): void {
    const point = Point.from(value);
    if (Point.equals(point, this.#current)) return;
    const delta = Point.delta(point, this.#current);
    const elapsed = timestamp - this.#timestamp;
    this.velocity =
      elapsed > 0
        ? { x: Math.round((delta.x / elapsed) * 100), y: Math.round((delta.y / elapsed) * 100) }
        : { x: 0, y: 0 };
    this.#timestamp = timestamp;
    this.previous = this.#current;
    this.#current = point;
  }
  get delta(): Point {
    return Point.delta(this.current, this.initial);
  }
  get direction(): 'left' | 'right' | 'up' | 'down' | null {
    if (!this.previous) return null;
    const delta = Point.delta(this.current, this.previous);
    if (!delta.x && !delta.y) return null;
    if (Math.abs(delta.x) > Math.abs(delta.y)) return delta.x > 0 ? 'right' : 'left';
    return delta.y > 0 ? 'down' : 'up';
  }
  reset(value = this.defaultValue): void {
    this.initial = this.#current = Point.from(value);
    this.previous = undefined;
    this.#timestamp = 0;
    this.velocity = { x: 0, y: 0 };
  }
}
