export default class FaceRenderResult {
  readonly key: any;
  readonly version: number;
  readonly nodes: Node[];

  constructor(key: any, version: number, doc: DocumentFragment) {
    this.key = key;
    this.version = version;
    this.nodes = [...doc.childNodes];
  }

  public AppendTo(newParent: Node | Range): void {
    if (newParent instanceof Node) {
      this.nodes.forEach((node) => newParent.appendChild(node));
    } else if (newParent instanceof Range) {
      this.nodes.forEach((node) => newParent.insertNode(node));
    }
  }
}
