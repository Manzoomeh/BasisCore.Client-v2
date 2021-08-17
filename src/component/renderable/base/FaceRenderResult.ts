export default class FaceRenderResult {
  readonly key: any;
  readonly version: number;
  readonly element: HTMLElement;

  constructor(key: any, version: number, element: HTMLElement) {
    this.key = key;
    this.version = version;
    this.element = element;
  }

  public AppendTo(newParent: Node | Range): void {
    if (newParent instanceof Node) {
      newParent.appendChild(this.element);
    } else if (newParent instanceof Range) {
      newParent.insertNode(this.element);
    }
  }
}
