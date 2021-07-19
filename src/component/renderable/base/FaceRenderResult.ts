export default class FaceRenderResult {
  key: any;
  readonly nodes: Node[];
  constructor(key: any, doc: DocumentFragment) {
    this.key = key;
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
