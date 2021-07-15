import FaceRenderResult from "./FaceRenderResult";

export default class FaceRenderResultList<
  T extends FaceRenderResult
> extends Map<any, T> {}
