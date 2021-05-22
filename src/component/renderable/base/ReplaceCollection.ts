import Replace from "./Replace";

export default class ReplaceCollection extends Array<Replace> {
  constructor(...elements: Replace[]) {
    super(...elements);
  }
  Applay(faceRenderResult: string): string {
    this.forEach((item) => (faceRenderResult = item.Applay(faceRenderResult)));
    return faceRenderResult;
  }
}
