import FaceRenderResult from "./FaceRenderResult";
import FaceRenderResultList from "./FaceRenderResultList";

export default class RenderDataPartResult<
  TRenderResult extends FaceRenderResult
> {
  constructor(
    readonly result: DocumentFragment[],
    readonly repository: FaceRenderResultList<TRenderResult>
  ) {}
}
