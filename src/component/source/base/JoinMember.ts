import IContext from "../../../context/IContext";
import Data from "../../../data/Data";
import IData from "../../../data/IData";
import { JoinType } from "../../../enum";
import InvalidPropertyValueException from "../../../exception/InvalidPropertyValueException";
import IBasisCore from "../../../IBasisCore";
import InMemoryMember from "./InMemoryMember";

declare var $bc: IBasisCore;

export default class JoinMember extends InMemoryMember {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  async ParseDataAsync(): Promise<IData> {
    var formatToken = this.element.GetStringToken("jointype", this.context);
    var tmpVal = (await formatToken.getValueAsync()) ?? "innerjoin";
    var format = JoinType[tmpVal.toLowerCase()];

    var leftData = await this.element
      .GetStringToken("lefttblcol", this.context)
      ?.getValueAsync();
    var rightData = await this.element
      .GetStringToken("righttblcol", this.context)
      .getValueAsync();

    var leftDataParts = leftData.split(".", 3);
    var rightDataParts = rightData.split(".", 3);

    if (leftDataParts.length != 3) {
      throw new InvalidPropertyValueException("LeftDataMember", leftData);
    }
    if (rightDataParts.length != 3) {
      throw new InvalidPropertyValueException("RightTableColumn", rightData);
    }

    var leftDataMember = leftDataParts.slice(0, 2).join(".");
    var rightDataMember = rightDataParts.slice(0, 2).join(".");

    var leftSource = await this.context.repository.waitToGetAsync(
      leftDataMember
    );
    var rightSource = await this.context.repository.waitToGetAsync(
      rightDataMember
    );

    var leftTableColumn = leftDataParts[2];
    var rightTableColumn = rightDataParts[2];

    var joinResultCol = leftSource.data.Columns.filter(
      (x) => x != "rownumber"
    ).map((x) => `ltbl.[${x}] AS [${leftDataMember}.${x}]`);
    joinResultCol = joinResultCol.concat(
      rightSource.data.Columns.filter((x) => x != "rownumber").map(
        (x) => `rtbl.[${x}] AS [${rightDataMember}.${x}]`
      )
    );

    var joinType = "JOIN";
    switch (format) {
      case JoinType.innerjoin: {
        joinType = "INNER JOIN";
        break;
      }
      case JoinType.leftjoin: {
        joinType = "LEFT JOIN";
        break;
      }
      case JoinType.rightjoin: {
        joinType = "RIGHT JOIN";
        break;
      }
    }
    var lib = await this.context.getOrLoadDbLibAsync();
    var t = lib(
      `SELECT ${joinResultCol.join(
        ","
      )} FROM ? AS ltbl ${joinType} ? AS rtbl ON ltbl.${leftTableColumn} = rtbl.${rightTableColumn}`,
      [leftSource.data.Rows, rightSource.data.Rows]
    );

    var data = new Data("", t);
    return data;
  }
}
