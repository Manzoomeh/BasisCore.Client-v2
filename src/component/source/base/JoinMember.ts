import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import { JoinType } from "../../../enum";
import InvalidPropertyValueException from "../../../exception/InvalidPropertyValueException";
import IBasisCore from "../../../IBasisCore";
import InMemoryMember from "./InMemoryMember";

export default class JoinMember extends InMemoryMember {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  async ParseDataAsync(): Promise<Array<any>> {
    var formatToken = this.element.GetStringToken("jointype", this.context);
    var tmpVal = (await formatToken.getValueAsync()) ?? "innerjoin";
    var format = JoinType[tmpVal.toLowerCase()];

    var leftData = await this.element
      .GetStringToken("lefttblcol", this.context)
      ?.getValueAsync();
    var rightData = await this.element
      .GetStringToken("righttblcol", this.context)
      ?.getValueAsync();

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

    var leftSource = await this.context.waitToGetSourceAsync(leftDataMember);
    var rightSource = await this.context.waitToGetSourceAsync(rightDataMember);

    var leftTableColumn = leftDataParts[2];
    var rightTableColumn = rightDataParts[2];

    var joinResultCol = this.getSourceFieldNameList(leftSource)
      .filter((x) => x != "rownumber")
      .map(
        (x) => `ltbl.[${x}] AS [${leftDataParts[0]}_${leftDataParts[1]}_${x}]`
      );
    joinResultCol = joinResultCol.concat(
      this.getSourceFieldNameList(rightSource)
        .filter((x) => x != "rownumber")
        .map(
          (x) =>
            `rtbl.[${x}] AS [${rightDataParts[0]}_${rightDataParts[1]}_${x}]`
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
    return lib(
      `SELECT ${joinResultCol.join(
        ","
      )} FROM ? AS ltbl ${joinType} ? AS rtbl ON ltbl.${leftTableColumn} = rtbl.${rightTableColumn}`,
      [leftSource.rows, rightSource.rows]
    );
  }

  private getSourceFieldNameList(source: ISource): Array<string> {
    return source && source.rows && source.rows.length > 0
      ? Object.getOwnPropertyNames(source.rows[0])
      : [];
  }
}
