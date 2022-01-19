import FaceRenderResult from "./FaceRenderResult";

export default class TreeFaceRenderResult extends FaceRenderResult {
  private contentRange: Range;
  private contentNodes: Node[] = null;

  constructor(key: any, version: number, element: Element) {
    super(key, version, element);
    const childContainer = element.querySelector(
      'basis-core-template-tag[data-type="child"]'
    );
    if (childContainer) {
      this.contentRange = new Range();
      this.contentRange.selectNode(childContainer);
      this.contentRange.deleteContents();
    }
  }

  setContent(content: DocumentFragment): void {
    if (this.contentRange) {
      const oldContentNodes = this.contentNodes;
      if (oldContentNodes?.length > 0) {
        this.contentRange.detach();
        this.contentRange = new Range();
        this.contentRange.setStartBefore(oldContentNodes[0]);
        this.contentRange.setEndAfter(
          oldContentNodes[oldContentNodes.length - 1]
        );
        this.contentRange?.deleteContents();
      }
      if (content) {
        this.contentNodes = [...content.childNodes];
        this.contentRange?.insertNode(content);
      } else {
        this.contentRange?.deleteContents();
        this.contentNodes = null;
      }
    }
  }
}
