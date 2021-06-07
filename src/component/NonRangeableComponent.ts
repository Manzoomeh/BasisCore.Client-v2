import IContext from "../context/IContext";
import Component from "./Component";

export abstract class NonRangeableComponent<
  TElement extends Element
> extends Component<TElement> {
  constructor(element: TElement, context: IContext) {
    super(element, context);
  }

  public async initializeAsync(): Promise<void> {
    const rendering = await this.getAttributeValueAsync("bc-rendering");
    if (rendering) {
      try {
        this.onRendering = new Function(
          "node",
          `return ${rendering}(node);`
        ) as any;
      } catch {
        /*nothing*/
      }
    }

    const rendered = await this.getAttributeValueAsync("bc-rendered");
    if (rendered) {
      try {
        this.onRendered = new Function("node", `${rendered}(node);`) as any;
      } catch {
        /*nothing*/
      }
    }
  }
  protected async getAttributeValueAsync(
    attributeName: string,
    defaultValue: string = null
  ): Promise<string> {
    const token = this.node.GetStringToken(attributeName, this.context);
    return (await token?.getValueAsync()) ?? defaultValue;
  }

  protected async getAttributeBooleanValueAsync(
    attributeName: string,
    defaultValue: boolean = false
  ): Promise<Boolean> {
    const token = this.node.GetBooleanToken(attributeName, this.context);
    return (await token?.getValueAsync()) ?? defaultValue;
  }
}
