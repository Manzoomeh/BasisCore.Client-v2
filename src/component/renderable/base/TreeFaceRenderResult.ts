import FaceRenderResult from "./FaceRenderResult";

export default class TreeFaceRenderResult extends FaceRenderResult {
  //readonly childContainer: Element;
  private range: Range;
  readonly doc: DocumentFragment;
  private childNodes: Node[] = null;
  constructor(key: any, doc: DocumentFragment) {
    super(key, doc);
    this.doc = doc;
    const childContainer = doc.querySelector(
      'basis-core-template-tag[data-type="child"]'
    );

    if (childContainer) {
      this.range = new Range();
      this.range.selectNode(childContainer);
      this.range.deleteContents();
    }
  }

  setChild(child: DocumentFragment): void {
    if (this.range) {
      if (this.childNodes?.length > 0) {
        this.range = new Range();
        this.range.setStartBefore(this.childNodes[0]);
        this.range.setEndAfter(this.childNodes[this.childNodes.length - 1]);
      }

      this.childNodes = [...child.childNodes];
      this.range?.deleteContents();

      if (child) {
        this.range?.insertNode(child);
      }
    }
  }
}
