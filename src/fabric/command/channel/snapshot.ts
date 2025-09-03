import { Argv, Arguments } from 'yargs'
import Channel from '../../service/channel'
import prompts from 'prompts'
import config from '../../config'
import { onCancel, ParamsError, ProcessError } from '../../../util'
import { getChannelList } from '../../model/prompts/util'

export const command = 'snapshot'

export const des = '對channel進行快照'

const channelList = getChannelList(config)
const operations = ['submit', 'listPending', 'join', 'cancel']

interface OptType {
  interactive: boolean
  block: number
  channelName: string
  snapshotPath: string
  operation: string
}

export const builder = (yargs: Argv<OptType>) => {
  return yargs
    .option('interactive', { type: 'boolean', description: '是否使用 Cathay BDK 互動式問答', alias: 'i' })
    .option('block', { type: 'number', description: '欲提交或取消的快照區塊號碼', alias: 'b' })
    .option('channelName', { type: 'string', choices: channelList, description: '欲快照的 Channel 名稱', alias: 'c' })
    .option('snapshotPath', { type: 'string', description: '欲使用的快照路徑', alias: 'p' })
    .option('operation', { type: 'string', choices: operations, description: '欲加入 Channel 的名稱', alias: 'o' })
}

const operationChoices = [
  { title: 'submitRequest', value: 'submit' },
  { title: 'listPending', value: 'listPending' },
  { title: 'joinBySnapshot', value: 'join' },
  { title: 'cancelRequest', value: 'cancel' },
]

export const handler = async (argv: Arguments<OptType>) => {
  const channel = new Channel(config)
  try {
    const { operation, interactive, channelName, block, snapshotPath } = argv

    if (interactive) {
      return await runInteractiveMode(channel)
    }
    if (!operation) {
      throw new ParamsError('Operation type is needed!')
    }
    switch (operation) {
      case 'submit':
        if (!channelName || !block) {
          throw new ParamsError('Channel name and block number are needed!')
        }
        await channel.submitSnapshotRequest({ channelName: channelName, blockNumber: block })
        break
      case 'listPending':
        if (!channelName) {
          throw new ParamsError('Channel name is needed!')
        }
        await channel.listPendingSnapshots({ channelName: channelName })
        break
      case 'cancel':
        if (!channelName || !block) {
          throw new ParamsError('Channel name and block name are needed!')
        }
        await channel.cancelSnapshotRequest({ channelName: channelName, blockNumber: block })
        break
      case 'join':
        if (!snapshotPath) {
          throw new ParamsError('Snapshot path is needed!')
        }
        await channel.joinBySnapshot({ snapshotPath: snapshotPath })
        break
      default:
        throw new ParamsError('Unknown Operation Type!')
    }
  } catch (e: any) {
    throw new ProcessError(`[x] Process Error: ${e.message}`)
  }
}

async function runInteractiveMode (channel: Channel) {
  const { operation } = await prompts({
    type: 'select',
    name: 'operation',
    message: 'What is the operation type?',
    choices: operationChoices,
  }, { onCancel })

  switch (operation) {
    case 'submit': {
      const submitData = await prompts([
        {
          type: 'text',
          name: 'channelName',
          message: 'What is your channel name?',
        },
        {
          type: 'number',
          name: 'blockNumber',
          message: 'What is the block number?',
        },
      ], { onCancel })
      const submitResult = await channel.submitSnapshotRequest(submitData)
      console.log('stdout' in submitResult ? submitResult.stdout.replace(/\r\n/g, '') : '')
      break
    }
    case 'listPending': {
      const listData = await prompts({
        type: 'text',
        name: 'channelName',
        message: 'What is your channel name?',
      }, { onCancel })
      const listResult = await channel.listPendingSnapshots(listData)
      console.log('stdout' in listResult ? listResult.stdout.replace(/\r\n/g, '') : '')
      break
    }
    case 'cancel': {
      const cancelData = await prompts([
        {
          type: 'text',
          name: 'channelName',
          message: 'What is your channel name?',
        },
        {
          type: 'number',
          name: 'blockNumber',
          message: 'What is the block number?',
          // validate: value => value > 0 || '必須大於0'
        },
      ], { onCancel })
      const cancelResult = await channel.cancelSnapshotRequest(cancelData)
      console.log('stdout' in cancelResult ? cancelResult.stdout.replace(/\r\n/g, '') : '')
      break
    }
    case 'join': {
      const joinData = await prompts({
        type: 'text',
        name: 'snapshotPath',
        message: 'What is your snapshot path?',
      }, { onCancel })
      const joinResult = await channel.joinBySnapshot(joinData)
      console.log('stdout' in joinResult ? joinResult.stdout.replace(/\r\n/g, '') : '')
      break
    }
  }
}
