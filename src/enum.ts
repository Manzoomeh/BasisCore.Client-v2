export enum FaceRowType {
  NotSet = 0,
  Odd,
  Even,
}

export enum MergeType {
  replace,
  append,
}

export enum JoinType {
  innerjoin,
  leftjoin,
  rightjoin,
}

export enum Priority {
  high,
  normal,
  low,
  none,
}

export enum DataStatus {
  added = 0,
  edited = 1,
  deleted = 2,
}
