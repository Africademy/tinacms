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

import { FieldMeta, useCMS } from 'tinacms'
import styled from 'styled-components'
import React from 'react'
import { GithubClient } from '../github-client'

const MetaLink = styled.a`
  display: block;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  color: var(--tina-color-primary-dark);
`

const ForkInfo = () => {
  const cms = useCMS()
  const github: GithubClient = cms.api.github
  return (
    <FieldMeta name={'Fork'}>
      <MetaLink
        target="_blank"
        href={`https://github.com/${github.repoFullName}`}
      >
        {github.repoFullName}
      </MetaLink>
    </FieldMeta>
  )
}

export const ForkNameToolbarWidget = {
  __type: 'toolbar:widget',
  name: 'current-fork',
  weight: 1,
  component: ForkInfo,
}
