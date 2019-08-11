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
    const {blockdevices} = result
    cb(null, blockdevices.filter(dev => {
      return dev.type !== 'loop'
    }))
  })
}

function bail(err) {
  console.error(`${err.message}`)
  rl.close()
  process.exit(1)
}

function tags(dev) {
  const {subsystems} = dev
  const result = subsystems.split(':').filter(x => {
    return x !== 'pci' && x !== 'block' && x !== 'scsi'
  })
  if (Number(dev.hotplug)) result.push('hotplug')
  if (isMounted(dev)) result.push('mounted')
  return result
}

function isMounted(dev) {
  const {children} = dev
  
  for(let part of children || []) {
    const {mountpoint} = part
    if (mountpoint) return true
  }
  return false
}
function showDev(i, dev) {
  const {name, model, serial, size, subsystems, children} = dev
  console.error(`${i}. ${name} ${hs(size)} ${model ? model.trim() : '[no model]'}, #${serial || '[no serial]'} (${tags(dev)})`)
  for(let part of children || []) {
    const {fstype, size, label, uuid, mountpoint} = part
    console.error(`  ${fstype || '[no filesystem]'} ${hs(size)} ${label || '[no label]'} ${uuid || '[no UUID]'} ${mountpoint ? 'mounted to ' + mountpoint : ''}`)
  }
}

function showMenu() {
  getDevices( (err, blockdevices) => {
    if (err) bail(err)

    let i = 0
    for(let dev of blockdevices) {
      showDev(++i, dev)
    }
    rl.question( 'Select target disk (q to quit): ', answer => {
      if (answer == 'q') bail(new Error('aborted by user'))
      if (Number(answer) > 0 && Number(answer) <= blockdevices.length) {
        const dev = blockdevices[Number(answer)-1]
        if (isMounted(dev)) {
          console.error('The selected device is currently used (mounted). Please select another device.')
          return showMenu()
        }
        console.log(dev.name)
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

