import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { markRaw, nextTick, ref } from 'vue'
import BottomActionBar from '../app/components/storytime/controls/BottomActionBar.client.vue'

describe('BottomActionBar tracking attributes', () => {
  it('marks navigation and share controls as story-control interactions', () => {
    const wrapper = mount(BottomActionBar, {
      props: {
        activeIndex: 1,
        total: 3,
        showShare: true,
      },
    })

    const previous = wrapper.get('button[aria-label="Previous"]')
    expect(previous.attributes('data-au-track')).toBe('story-control')
    expect(previous.attributes('data-au-label')).toBe('Previous')
    expect(previous.attributes('data-au-modifier')).toBe('previous')

    const share = wrapper.get('button[aria-label="Copy link"]')
    expect(share.attributes('data-au-track')).toBe('story-control')
    expect(share.attributes('data-au-label')).toBe('Copy link')
    expect(share.attributes('data-au-modifier')).toBe('share')

    const next = wrapper.get('button[aria-label="Next"]')
    expect(next.attributes('data-au-track')).toBe('story-control')
    expect(next.attributes('data-au-label')).toBe('Next')
    expect(next.attributes('data-au-modifier')).toBe('next')
  })

  it('marks video controls with action-oriented modifiers', async () => {
    const wrapper = mount(BottomActionBar, {
      props: {
        activeIndex: 1,
        total: 3,
        showVideoControls: true,
      },
    })
    await wrapper.setProps({
      activeVisual: markRaw({
          __isHeroVideo: true,
          play: () => {},
          pause: () => {},
          toggleMute: () => {},
          isPlaying: ref(true),
          isMuted: ref(false),
      }),
    })
    await nextTick()

    const pause = wrapper.get('button[aria-label="Pause"]')
    expect(pause.attributes('data-au-track')).toBe('story-control')
    expect(pause.attributes('data-au-label')).toBe('Pause')
    expect(pause.attributes('data-au-modifier')).toBe('pause')

    const mute = wrapper.get('button[aria-label="Sound on"]')
    expect(mute.attributes('data-au-track')).toBe('story-control')
    expect(mute.attributes('data-au-label')).toBe('Sound on')
    expect(mute.attributes('data-au-modifier')).toBe('mute')
  })

  it('uses unmute as the muted-state click modifier', async () => {
    const wrapper = mount(BottomActionBar, {
      props: {
        activeIndex: 1,
        total: 3,
        showVideoControls: true,
      },
    })
    await wrapper.setProps({
      activeVisual: markRaw({
          __isHeroVideo: true,
          play: () => {},
          pause: () => {},
          toggleMute: () => {},
          isPlaying: ref(false),
          isMuted: ref(true),
      }),
    })
    await nextTick()

    const unmute = wrapper.get('button[aria-label="Sound off"]')
    expect(unmute.attributes('data-au-track')).toBe('story-control')
    expect(unmute.attributes('data-au-label')).toBe('Sound off')
    expect(unmute.attributes('data-au-modifier')).toBe('unmute')
  })
})
