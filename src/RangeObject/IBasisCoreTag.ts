import IComponent from "../component/IComponent";
import "./BasisCoreTag";

export default interface IBasisCoreTag extends HTMLElement {
  owner: IComponent;
  setOwner(owner: IComponent);
}
