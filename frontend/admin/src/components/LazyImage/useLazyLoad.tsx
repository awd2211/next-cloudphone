/**
 * 懒加载 Hook
 *
 * 通用的懒加载逻辑,可用于图片、组件等任何需要延迟加载的内容
 */

import { useState, useEffect, useRef, RefObject } from 'react';

export interface UseLazyLoadOptions {
  /** 根元素的 margin,用于提前加载 (默认 '50px') */
  rootMargin?: string;

  /** 可见度阈值 (默认 0.01,即 1% 可见时触发) */
  threshold?: number;

  /** 是否只触发一次 (默认 true) */
  triggerOnce?: boolean;

  /** 自定义根元素 (默认为 viewport) */
  root?: Element | null;
}

export interface UseLazyLoadResult {
  /** 元素是否在视口中 */
  isInView: boolean;

  /** 要绑定到元素的 ref */
  ref: RefObject<HTMLElement | null>;
}

/**
 * 懒加载 Hook
 *
 * @example
 * ```tsx
 * const { isInView, ref } = useLazyLoad({ rootMargin: '100px' });
 *
 * return (
 *   <div ref={ref}>
 *     {isInView ? <ExpensiveComponent /> : <Placeholder />}
 *   </div>
 * );
 * ```
 */
export const useLazyLoad = (options: UseLazyLoadOptions = {}): UseLazyLoadResult => {
  const {
    rootMargin = '50px',
    threshold = 0.01,
    triggerOnce = true,
    root = null,
  } = options;

  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // 如果已经触发过且只需触发一次,则不再观察
    if (triggerOnce && isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);

            // 如果只触发一次,则停止观察
            if (triggerOnce) {
              observer.unobserve(entry.target);
            }
          } else {
            // 如果不是只触发一次,当元素离开视口时重置状态
            if (!triggerOnce) {
              setIsInView(false);
            }
          }
        });
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [rootMargin, threshold, triggerOnce, root, isInView]);

  return {
    isInView,
    ref,
  };
};
