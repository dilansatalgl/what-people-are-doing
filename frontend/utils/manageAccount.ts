export type DeleteAccountOutcome = "deleted" | "session-ended" | "error";

export const getDeleteAccountOutcome = (
  status: number,
): DeleteAccountOutcome => {
  if (status === 200) {
    return "deleted";
  }

  if (status === 401 || status === 404) {
    return "session-ended";
  }

  return "error";
};
