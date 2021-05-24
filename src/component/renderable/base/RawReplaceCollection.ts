import IContext from "../../../context/IContext";
import TokenUtil from "../../../token/TokenUtil";
import RawReplace from "./RawReplace";
import Replace from "./Replace";
import ReplaceCollection from "./ReplaceCollection";

export default class RawReplaceCollection extends Array<RawReplace> {
  static Create(element: Element, context: IContext): RawReplaceCollection {
    var retVal = new RawReplaceCollection();
    element
      .querySelectorAll("replace")
      .forEach((x) => retVal.push(new RawReplace(x, context)));
    return retVal;
  }

  async ProcessAsync(context: IContext): Promise<ReplaceCollection> {
    var taskList = this.map(
      async (x) =>
        new Replace(
          await x.TagName?.getValueAsync(),
          await x.Content?.getValueAsync()
        )
    );

    var list = await Promise.all(taskList);
    return new ReplaceCollection(...list);
  }
}
