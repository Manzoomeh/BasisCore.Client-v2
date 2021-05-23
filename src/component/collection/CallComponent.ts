import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import IDataSource from "../../data/IDataSource";
import CommandComponent from "../CommandComponent";

@injectable()
export default class Call extends CommandComponent {
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }

  protected async renderAsync(dataSource: IDataSource): Promise<string> {
    var filename = await this.getAttributeValueAsync("file");
    var pagesize = await this.getAttributeValueAsync("pagesize");
    // var commnad = await TokenUtil.GetValueOrDefaultAsync(
    //   this.node.outerHTML.ToStringToken(this.context),
    //   this.context
    // );

    var commnad = await this.content.textContent;
    console.log(commnad);
    return "";

    // var result = await this.context.LoadPageAsync(
    //   filename,
    //   commnad,
    //   pagesize,
    //   0
    // );
    // await this.ApplyResultAsync(result, turnContext, true);
  }
}
