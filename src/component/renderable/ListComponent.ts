import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import RenderableComponent from "./base/RenderableComponent";

@injectable()
export default class ListComponent extends RenderableComponent {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }
}
