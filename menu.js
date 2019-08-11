#!/usr/bin/env node
const {execFile} = require('child_process')
const hs = require('human-size')
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr
})

function getDevices(cb) {
  const child = execFile('lsblk', [
    '-Jbpo',
    'fstype,uuid,label,mountpoint,type,name,hotplug,model,size,serial,subsystems'
  ], (err, stdout, stderr) => {
    if (err) return cb(err)
    let result
    try{ 
      result = JSON.parse(stdout)
    } catch(err) {
      return cb(err)
    }
    cb(null, result)
  })
}

function bail(err) {
  console.error(`${err.message}`)
  rl.close()
  process.exit(1)
}

function tags(subsystems) {
  return subsystems.split(':').filter(x => {
    return x !== 'pci' && x !== 'block'
  })
}

function showDev(i, dev) {
  const {model, serial, size, subsystems, children} = dev
  console.error(`${i}. ${hs(size)} ${model}, #${serial} (${tags(subsystems)})`)
  for(let part of children) {
    const {fstype, size, label, uuid} = part
    console.error(`  ${fstype} ${hs(size)} ${label} ${uuid}`)
  }
}

function showMenu() {
  getDevices( (err, result) => {
    if (err) bail(err)
    console.error(result)
    const {blockdevices} = result

    let i = 0
    for(let dev of blockdevices) {
      showDev(++i, dev)
    }
    rl.question( 'Select target disk (q to quit): ', answer => {
      if (answer == 'q') bail(new Error('aborted by user'))
      if (Number(answer) > 0 && Number(answer) <= blockdevices.length) {
        console.log(blockdevices[Number(answer)-1].name)
        rl.close()
        process.exit(0)
      } else {
        console.error('Invalid answer')
        showMenu()
      }
    })
  })
}

showMenu()

