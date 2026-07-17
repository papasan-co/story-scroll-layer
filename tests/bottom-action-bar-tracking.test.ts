import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { markRaw, nextTick, ref } from 'vue'
import BottomActionBar from '../app/components/storytime/controls/BottomActionBar.client.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

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
    expect(previous.attributes('data-story-control')).toBe('previous')
    expect(previous.attributes('data-au-track')).toBe('story-control')
    expect(previous.attributes('data-au-label')).toBe('Previous')
    expect(previous.attributes('data-au-modifier')).toBe('previous')

    const share = wrapper.get('button[aria-label="Copy link"]')
    expect(share.attributes('data-story-control')).toBe('share')
    expect(share.attributes('data-au-track')).toBe('story-control')
    expect(share.attributes('data-au-label')).toBe('Copy link')
    expect(share.attributes('data-au-modifier')).toBe('share')

    const next = wrapper.get('button[aria-label="Next"]')
    expect(next.attributes('data-story-control')).toBe('next')
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

  it('renders optional hero video volume controls', async () => {
    const volumeDown = vi.fn()
    const volumeUp = vi.fn()
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
        volumeDown,
        volumeUp,
        isPlaying: ref(false),
        isMuted: ref(false),
        volume: ref(0.5),
      }),
    })
    await nextTick()

    const down = wrapper.get('button[aria-label="Volume down"]')
    expect(down.attributes('data-story-control')).toBe('volume-down')
    expect(down.attributes('data-au-track')).toBe('story-control')
    expect(down.attributes('data-au-modifier')).toBe('volume-down')
    await down.trigger('click')
    expect(volumeDown).toHaveBeenCalledTimes(1)

    const up = wrapper.get('button[aria-label="Volume up"]')
    expect(up.attributes('data-story-control')).toBe('volume-up')
    expect(up.attributes('data-au-track')).toBe('story-control')
    expect(up.attributes('data-au-modifier')).toBe('volume-up')
    await up.trigger('click')
    expect(volumeUp).toHaveBeenCalledTimes(1)
  })

  it('renders a tracked mobile CTA when controls are hidden below a breakpoint', async () => {
    const wrapper = mount(BottomActionBar, {
      attachTo: document.body,
      props: {
        activeIndex: 1,
        total: 3,
        hideOnMobileBelow: 9999,
        mobileCta: {
          url: 'mailto:hello@example.com',
          label: 'Book a free consultation',
          ariaLabel: 'Book a free consultation',
          target: '_self',
          trackLabel: 'book-consultation',
          trackModifier: 'mobile-cta',
        },
      },
    })
    await nextTick()

    const cta = wrapper.get('a.story-controls-mobile-cta')
    expect(cta.attributes('href')).toBe('mailto:hello@example.com')
    expect(cta.attributes('data-story-mobile-cta')).toBe('')
    expect(cta.attributes('data-story-control')).toBe('mobile-cta')
    expect(cta.attributes('data-au-track')).toBe('story-control')
    expect(cta.attributes('data-au-label')).toBe('book-consultation')
    expect(cta.attributes('data-au-modifier')).toBe('mobile-cta')
  })

  it('renders a generic controls mode hook', () => {
    const wrapper = mount(BottomActionBar, {
      props: {
        activeIndex: 1,
        total: 3,
        controlMode: 'arrows',
        showShare: false,
        showProgress: false,
      },
    })

    const shell = wrapper.get('[data-story-controls]')
    expect(shell.attributes('data-story-controls-mode')).toBe('arrows')
    expect(shell.classes()).toContain('story-controls-shell--arrows')
    expect(wrapper.get('[data-story-controls-divider]').exists()).toBe(true)
  })

  it('renders an opt-in tracked reaction control', async () => {
    const wrapper = mount(BottomActionBar, {
      props: {
        activeIndex: 1,
        total: 3,
        showShare: false,
        reaction: {
          enabled: true,
          label: 'Clap',
          count: 2,
          modifier: 'clap',
        },
      },
    })

    const reaction = wrapper.get('button[aria-label="Clap"]')
    expect(reaction.attributes('data-story-control')).toBe('reaction')
    expect(reaction.attributes('data-au-track')).toBe('story-control')
    expect(reaction.attributes('data-au-label')).toBe('Clap')
    expect(reaction.attributes('data-au-modifier')).toBe('clap')
    expect(reaction.text()).toContain('2')

    await reaction.trigger('click')
    await nextTick()
    expect(reaction.text()).toContain('3')
    expect(document.body.querySelectorAll('.story-controls-reaction-particle').length).toBeGreaterThan(0)
  })

  it('allows parent-owned previous navigation outside the step list', async () => {
    const stepJumper = vi.fn(() => true)
    const wrapper = mount(BottomActionBar, {
      props: {
        activeIndex: 0,
        total: 3,
        canGoPrevious: true,
        showShare: false,
        stepTargetResolver: () => null,
        stepJumper,
      },
    })

    const previous = wrapper.get('button[aria-label="Previous"]')
    expect(previous.attributes('disabled')).toBeUndefined()

    await previous.trigger('click')
    expect(stepJumper).toHaveBeenCalledWith(0, 'smooth', -1)
  })
})
