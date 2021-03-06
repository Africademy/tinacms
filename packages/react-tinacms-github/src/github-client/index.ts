/**

Copyright 2019 Forestry.io Inc

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

import { b64EncodeUnicode } from './base64'
import Cookies from 'js-cookie'

export class GithubClient {
  static FORK_COOKIE_KEY = 'fork_full_name'
  static HEAD_BRANCH_COOKIE_KEY = 'head_branch'

  proxy: string
  baseRepoFullName: string
  baseBranch: string

  constructor(
    proxy: string,
    baseRepoFullName: string,
    baseBranch: string = 'master'
  ) {
    this.proxy = proxy
    this.baseRepoFullName = baseRepoFullName
    this.baseBranch = baseBranch
  }

  async getUser() {
    try {
      const data = await this.req({
        url: `https://api.github.com/user`,
        method: 'GET',
      })

      return data
    } catch (e) {
      if ((e.status = 401)) {
        return
      }
      throw e
    }
  }

  async createFork() {
    const fork = await this.req({
      url: `https://api.github.com/repos/${this.baseRepoFullName}/forks`,
      method: 'POST',
    })

    this.setCookie(GithubClient.FORK_COOKIE_KEY, fork.full_name)

    return fork
  }

  createPR(title: string, body: string) {
    const forkRepoFullName = this.repoFullName
    const headBranch = this.branchName

    return this.req({
      url: `https://api.github.com/repos/${this.baseRepoFullName}/pulls`,
      method: 'POST',
      data: {
        title: title ? title : 'Update from TinaCMS',
        body: body ? body : 'Please pull these awesome changes in!',
        head: `${forkRepoFullName.split('/')[0]}:${headBranch}`,
        base: this.baseBranch,
      },
    })
  }

  get repoFullName(): string {
    const forkName = this.getCookie(GithubClient.FORK_COOKIE_KEY)

    if (!forkName) {
      // TODO: Right now the client only works with forks. This should go away once it works with origin.
      throw new Error('GithubClient cannot find name of fork')
    }

    return forkName
  }

  get branchName() {
    return this.getCookie(GithubClient.HEAD_BRANCH_COOKIE_KEY) || 'master'
  }

  async fetchExistingPR() {
    const forkRepoFullName = this.repoFullName
    const headBranch = this.branchName

    const branches = await this.req({
      url: `https://api.github.com/repos/${this.baseRepoFullName}/pulls`,
      method: 'GET',
    })

    for (let i = 0; i < branches.length; i++) {
      const pull = branches[i]
      if (headBranch === pull.head.ref) {
        if (
          pull.head.repo?.full_name === forkRepoFullName &&
          pull.base.repo?.full_name === this.baseRepoFullName
        ) {
          return pull // found matching PR
        }
      }
    }

    return
  }

  async getBranch() {
    try {
      const repoFullName = this.repoFullName
      const branch = this.branchName

      const data = await this.req({
        url: `https://api.github.com/repos/${repoFullName}/git/ref/heads/${branch}`,
        method: 'GET',
      })
      return data
    } catch (e) {
      if ((e.status = 404)) {
        return
      }
      throw e
    }

    // TODO
    // if (data.ref.startsWith('refs/heads/')) {
    //   //check if branch, and not tag
    //   return data
    // }
    // return // Bubble up error here?
  }

  async commit(
    filePath: string,
    sha: string,
    fileContents: string,
    commitMessage: string = 'Update from TinaCMS'
  ) {
    const repo = this.repoFullName
    const branch = this.branchName

    return this.req({
      url: `https://api.github.com/repos/${repo}/contents/${filePath}`,
      method: 'PUT',
      data: {
        message: commitMessage,
        content: b64EncodeUnicode(fileContents),
        sha,
        branch: branch,
      },
    })
  }

  private async req(data: any) {
    const response = await this.proxyRequest(data)
    return this.getGithubResponse(response)
  }

  private async getGithubResponse(response: Response) {
    const data = await response.json()
    //2xx status codes
    if (response.status.toString()[0] == '2') return data

    throw new GithubError(response.statusText, response.status)
  }

  /**
   * The methods below maybe don't belong on GitHub client, but it's fine for now.
   */
  private proxyRequest(data: any) {
    return fetch(this.proxy, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  private getCookie(cookieName: string): string | undefined {
    return Cookies.get(cookieName)
  }

  private setCookie(cookieName: string, val: string) {
    Cookies.set(cookieName, val, { sameSite: 'strict' })
  }
}

class GithubError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.message = message
    this.status = status
  }
}
