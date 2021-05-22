import { injectable } from "tsyringe";
import RenderableBase from "../../renderable/RenderableBase";

@injectable()
export default class List extends RenderableBase {
  constructor(element: Element) {
    super(element);
  }
}
