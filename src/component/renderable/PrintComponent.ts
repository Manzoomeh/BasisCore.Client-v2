import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import FaceRenderResult from "./base/FaceRenderResult";
import RenderableComponent from "./base/RenderableComponent";

@injectable()
export default class PrintComponent extends RenderableComponent<FaceRenderResult> {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    super(element, context, container);
  }
}
