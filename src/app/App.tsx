import styles from './App.module.css'

export function App() {
  return (
    <main className={styles.shell}>
      <p className={styles.eyebrow}>EVIDENCE BUREAU / SYSTEM 01</p>
      <h1>物证档案局</h1>
      <p className={styles.status}>调查终端正在准备案件档案。</p>
    </main>
  )
}
