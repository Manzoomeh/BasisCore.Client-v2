import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import RenderableComponent from "./base/RenderableComponent";

@injectable()
export default class PrintComponent extends RenderableComponent {
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }
}
