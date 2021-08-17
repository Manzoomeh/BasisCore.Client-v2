import FaceRenderResult from "./FaceRenderResult";
import FaceRenderResultRepository from "./FaceRenderResultRepository";

export default class RenderDataPartResult<
  TRenderResult extends FaceRenderResult
> {
  constructor(
    readonly result: Array<TRenderResult>,
    readonly repository: FaceRenderResultRepository<TRenderResult>
  ) {}
}
