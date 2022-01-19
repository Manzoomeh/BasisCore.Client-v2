export default class FaceRenderResult {
  readonly key: any;
  readonly version: number;
  readonly nodes: Array<Node>;

  constructor(key: any, version: number, element: Element) {
    this.key = key;
    this.version = version;
    this.nodes = Array.from(element.childNodes);
  }

  public AppendTo(newParent: Node | Range): void {
    if (newParent instanceof Node) {
      this.nodes.forEach((node) => newParent.appendChild(node));
    } else if (newParent instanceof Range) {
      const content = newParent.extractContents();
      this.nodes.forEach((node) => content.appendChild(node));
      newParent.insertNode(content);
    }
  }
}
