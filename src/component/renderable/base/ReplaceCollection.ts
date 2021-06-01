import Replace from "./Replace";

export default class ReplaceCollection extends Array<Replace> {
  constructor(...elements: Replace[]) {
    super(...elements);
  }
  public apply(faceRenderResult: string): string {
    this.forEach((item) => (faceRenderResult = item.apply(faceRenderResult)));
    return faceRenderResult;
  }
}
