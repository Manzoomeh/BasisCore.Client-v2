import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import RenderableComponent from "./base/RenderableComponent";

@injectable()
export default class ListComponent extends RenderableComponent {
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }
}
