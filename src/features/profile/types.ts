export interface ProfileInput {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
}

export interface PasswordChangeInput {
  currentPassword: string
  newPassword: string
}
