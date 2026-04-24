import styles from './ChainSelector.module.css';

interface ChainSelectorProps {
  chains: string[];
  selectedChain: string;
  onSelect: (chain: string) => void;
}

const ChainSelector = ({ chains, selectedChain, onSelect }: ChainSelectorProps) => {
  if (chains.length === 0) return null;

  return (
    <div className={styles.container}>
      <label className={styles.label}>📌 Сквозная цепочка:</label>
      <select 
        className={styles.select}
        value={selectedChain} 
        onChange={(e) => onSelect(e.target.value)}
      >
        {chains.map(chain => (
          <option key={chain} value={chain}>{chain}</option>
        ))}
      </select>
    </div>
  );
};

export default ChainSelector;