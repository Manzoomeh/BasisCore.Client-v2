import FaceRenderResult from "./FaceRenderResult";
import FaceRenderResultRepository from "./FaceRenderResultRepository";

export default class RenderDataPartResult<
  TRenderResult extends FaceRenderResult
> {
  constructor(
    readonly result: DocumentFragment[],
    readonly repository: FaceRenderResultRepository<TRenderResult>
  ) {}
}
