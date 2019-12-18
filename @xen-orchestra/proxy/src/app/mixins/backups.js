import { asyncMap } from '@xen-orchestra/async-map'
import limitConcurrency from 'limit-concurrency-decorator'
import mapValues from 'lodash/mapValues'
// import { createLogger } from '@xen-orchestra/log'
import { Xapi } from '@xen-orchestra/xapi'

// import { decorateWith } from '../../_decorateWith'
//
// const { debug, warn } = createLogger('xo:proxy:backups')

class VmBackup {
  constructor(backup, xapi, vmUuid) {
    this._xapi = xapi
  }

  async run() {}
}

class Backup {
  constructor({ job, remotes, schedule, xapis, recordToXapi }) {
    this._xapis = xapis
    this._recordToXapi = recordToXapi

    const { settings } = job
    this._settings = {
      ...settings[''],
      ...settings[schedule.id],
    }
  }

  run() {
    // FIXME: proper SimpleIdPattern handling
    const settings = this._settings
    return asyncMap(
      this._job.vms.__or,
      // FIXME: configurable default values
      limitConcurrency(settings.concurrency ?? 2, async vmUuid =>
        new VmBackup({
          vm: await this._getXapi(vmUuid).getRecordByUuid('VM', vmUuid),
          settings: { ...settings, ...this._job.settings[vmUuid] },
        }).run()
      )
    )
  }

  _getXapi(recordUuid) {
    const xapiId = this._recordToXapi[recordUuid]
    if (xapiId === undefined) {
      throw new Error('no XAPI associated to ' + recordUuid)
    }

    return this._xapis[xapiId]
  }
}

export default class Backups {
  constructor(app, { config: { xapiOptions: globalXapiOptions } }) {
    app.api.addMethods({
      backup: {
        run: [
          ({ xapis, ...rest }) =>
            new Backup({
              ...rest,
              xapis: Object.defineProperties(
                { __create__: null },
                mapValues(xapis, (xapiOptions, id) => ({
                  configurable: true,
                  get() {
                    const xapi = new Xapi({
                      ...globalXapiOptions,
                      ...xapiOptions,
                      watchEvents: false,
                    })
                    Object.defineProperty(this, { value: xapi })
                    return xapi
                  },
                }))
              ),
            }).run(),
          {
            description: 'run a backup job',
            params: {
              job: { type: 'object' },
              remotes: { type: 'object' },
              schedule: { type: 'object' },
              xapis: { type: 'object' },
              recordToXapi: { type: 'object' },
            },
          },
        ],
      },
    })
  }
}
