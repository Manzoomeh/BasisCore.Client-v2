import JoinMember from "./base/JoinMember";
import SqlMember from "./base/SqlMember";
import InMemoryMember from "./base/InMemoryMember";
import IContext from "../../context/IContext";

export default class SourceUtil {
  static ConvertToMember(element: Element, context: IContext): InMemoryMember {
    var retVal: InMemoryMember = null;
    var type = element.getAttribute("format")?.toLowerCase();
    switch (type) {
      case "join": {
        retVal = new JoinMember(element, context);
        break;
      }
      case "sql": {
        retVal = new SqlMember(element, context);
        break;
      }
    }
    return retVal;
  }
}
