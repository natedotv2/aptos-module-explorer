import { Types } from 'aptos'
import { FC, useState } from 'react'
import { useAptosClient } from 'src/hooks/useAptosClient'
import { useSettings } from 'src/hooks/useSettings'
import { useWallet } from 'src/hooks/useWallet'
import { isEventHandle, isResource, notFalsy } from 'src/utils/filter'
import styled from 'styled-components'
import { Control, Section } from '../common'
import { EventsForm } from './EventsForm'
import { FunctionForm } from './FunctionForm'
import { ResourceForm } from './ResourceForm'

type ModulesProps = {
  modules: Types.MoveModule[]
}
export const Modules: FC<ModulesProps> = ({ modules }) => {
  const { signer } = useWallet()
  const {
    values: { moduleName },
    updateValues,
  } = useSettings()
  const { client } = useAptosClient()
  const [word, setWord] = useState(moduleName)
  const [hideNoFunctions, setHideNoFunctions] = useState(true)
  const [hideNoResources, setHideNoResources] = useState(false)
  return (
    <Section>
      <h2>Modules</h2>
      <Control>
        <input
          placeholder="module name..."
          value={word}
          onChange={({ target: { value } }) => setWord(value)}
          onBlur={({ target: { value } }) =>
            updateValues({ moduleName: value })
          }
        />
        <label>
          <input
            type="checkbox"
            checked={hideNoFunctions}
            onChange={({ target: { checked } }) => setHideNoFunctions(checked)}
          />
          Hide No Function Modules
        </label>
        <label>
          <input
            type="checkbox"
            checked={hideNoResources}
            onChange={({ target: { checked } }) => setHideNoResources(checked)}
          />
          Hide No Resource Modules
        </label>
      </Control>
      {modules
        .filter(({ name }) => !word || name.includes(word))
        .map((module) => {
          const entryFunctions = module.exposed_functions.filter(
            ({ is_entry }) => is_entry,
          )
          if (entryFunctions.length === 0 && hideNoFunctions) return <></>
          const resources = module.structs.filter(isResource)
          if (resources.length === 0 && hideNoResources) return <></>

          const moduleId = `${module.address}::${module.name}`
          const events = resources.flatMap(({ name, fields }) =>
            fields.filter(isEventHandle).map(({ name: fieldName }) => ({
              eventHandle: `${moduleId}::${name}`,
              fieldName,
            })),
          )
          return (
            <details key={module.name}>
              <summary>
                {moduleId}
                <span>{`(${entryFunctions.length} entry functions, ${resources.length} resources, ${events.length} events)`}</span>
              </summary>
              {entryFunctions.length > 0 && (
                <Functions>
                  <summary>Functions</summary>
                  {entryFunctions.map((fn) => (
                    <FunctionForm
                      key={fn.name}
                      fn={fn}
                      onSubmit={async (data) => {
                        if (!signer) return
                        const payload = {
                          type: 'entry_function_payload',
                          function: `${module.address}::${module.name}::${fn.name}`,
                          type_arguments: data.type_arguments.filter(notFalsy),
                          arguments: data.arguments,
                        }
                        console.log(payload)
                        signer.signAndSubmitTransaction(payload)
                      }}
                    />
                  ))}
                </Functions>
              )}
              {resources.length > 0 && (
                <Structs>
                  <summary>Resources</summary>
                  {resources.map((struct) => (
                    <ResourceForm
                      key={struct.name}
                      moduleId={moduleId}
                      resource={struct}
                      getAccountResources={
                        client
                          ? (...args) => client.getAccountResources(...args)
                          : undefined
                      }
                    />
                  ))}
                </Structs>
              )}
              {events.length > 0 && (
                <Structs>
                  <summary>Events</summary>
                  {events.map(({ fieldName, eventHandle }) => (
                    <EventsForm
                      key={fieldName}
                      event={{ eventHandle, fieldName }}
                      getEventsByEventHandle={
                        client
                          ? (...args) => client.getEventsByEventHandle(...args)
                          : undefined
                      }
                    />
                  ))}
                </Structs>
              )}
            </details>
          )
        })}
    </Section>
  )
}

const Structs = styled.details`
  > div {
    margin-top: 16px;
    margin-left: 16px;
    padding: 12px 16px 6px;
    label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      input {
        padding: 4px 8px;
        width: 50%;
      }
    }
  }
`

const Functions = styled.details`
  display: flex;
  flex-direction: column;
  row-gap: 8px;
  > div {
    margin-top: 8px;
    :last-child {
      margin-bottom: 16px;
    }
  }
`