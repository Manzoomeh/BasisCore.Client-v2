import ClientException from "./exception/ClientException";
import IBasisCore from "./IBasisCore";
import { singleton } from "tsyringe";
import GlobalContext from "./context/GlobalContext";
import ComponentCollection from "./component/collection/ComponentCollection";
import { SourceId } from "./type-alias";

@singleton()
export default class BasisCore implements IBasisCore {
  readonly context: GlobalContext;
  private content: ComponentCollection;

  constructor(context: GlobalContext) {
    this.context = context;
  }
  addSource(sourceId: SourceId, data: any, replace: boolean = true) {
    this.context.addAsSource(sourceId, data, replace);
  }

  setArea(selector: string): void;
  setArea(element: Element): void;
  setArea(param: any): void {
    var element: Array<Element>;
    if (typeof param === "string") {
      element = Array.from(document.querySelectorAll(param));
    } else if (param instanceof Element) {
      element = [param];
    } else {
      throw new ClientException("Invalid Argument");
    }
    this.content = new ComponentCollection(element, this.context);
    this.content.initializeAsync().then((_) => this.content.runAsync());
  }
}
