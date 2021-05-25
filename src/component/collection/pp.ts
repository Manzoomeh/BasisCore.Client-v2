import IContext from "../../context/IContext";
import Component from "../Component";

export abstract class pp extends Component<Element> {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  //public abstract runAsync(): Promise<void>;
}
