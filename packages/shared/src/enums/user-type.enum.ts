/**
 * The kind of authentication identity a User is (spec 025).
 * Not to be confused with ActorType: Actors are market participants,
 * Users are identities operating the admin/API.
 */
export enum UserType {
  /** A person; logs into the web admin with a password. */
  HUMAN = 'human',
  /** An AI agent; no password, authenticates via admin-provisioned API keys only. */
  AGENT = 'agent',
}
