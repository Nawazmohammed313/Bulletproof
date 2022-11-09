export const sleep = (milliseconds: number) => {
  return new Promise((resolve, reject) => setTimeout(resolve, milliseconds));
};
