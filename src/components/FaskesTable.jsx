import React, { useState } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Building2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function FaskesTable({ gudangSummary }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('totalStok');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter by search term
  const filteredData = (gudangSummary || []).filter((g) =>
    g.gudang.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 inline-block ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-cyan-400 inline-block ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-cyan-400 inline-block ml-1" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Filter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            Tabel Agregasi per Faskes / Gudang ({gudangSummary?.length || 0} Gudang)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ringkasan stok fisik, alokasi jual, penjualan kasir, net transfer, dan selisih SO per lokasi gudang.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter nama Faskes / Gudang..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Interactive Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/90 text-cyan-300 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4 cursor-pointer select-none" onClick={() => handleSort('gudang')}>
                Faskes / Gudang {renderSortIcon('gudang')}
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer select-none" onClick={() => handleSort('totalStok')}>
                Stok saat ini (Dosis) {renderSortIcon('totalStok')}
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer select-none" onClick={() => handleSort('totalStokJual')}>
                Stok Alokasi Jual {renderSortIcon('totalStokJual')}
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer select-none" onClick={() => handleSort('totalStokKasir')}>
                Terjual Kasir {renderSortIcon('totalStokKasir')}
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer select-none" onClick={() => handleSort('netTransfer')}>
                Net Transfer {renderSortIcon('netTransfer')}
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer select-none" onClick={() => handleSort('totalSelisihSO')}>
                Selisih SO {renderSortIcon('totalSelisihSO')}
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer select-none" onClick={() => handleSort('batchCount')}>
                Varian Batch {renderSortIcon('batchCount')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  Tidak ada faskes/gudang yang cocok dengan pencarian.
                </td>
              </tr>
            ) : (
              sortedData.map((g, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-all">
                  
                  {/* Gudang Name */}
                  <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>{g.gudang}</span>
                  </td>

                  {/* Stok Saat Ini */}
                  <td className="py-4 px-4 text-right font-extrabold text-cyan-300 text-sm">
                    {g.totalStok.toLocaleString('id-ID')}
                  </td>

                  {/* Stok Alokasi Jual */}
                  <td className="py-4 px-4 text-right font-semibold text-slate-300">
                    {g.totalStokJual.toLocaleString('id-ID')}
                  </td>

                  {/* Terjual Kasir */}
                  <td className="py-4 px-4 text-right font-extrabold text-emerald-400">
                    {g.totalStokKasir.toLocaleString('id-ID')}
                  </td>

                  {/* Net Transfer */}
                  <td className="py-4 px-4 text-right font-mono">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      g.netTransfer > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : g.netTransfer < 0
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'text-slate-400'
                    }`}>
                      {g.netTransfer > 0 ? `+${g.netTransfer}` : g.netTransfer}
                    </span>
                  </td>

                  {/* Selisih SO */}
                  <td className="py-4 px-4 text-right font-mono">
                    {g.totalSelisihSO !== 0 ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30">
                        {g.totalSelisihSO > 0 ? `+${g.totalSelisihSO}` : g.totalSelisihSO}
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>

                  {/* Varian Batch */}
                  <td className="py-4 px-4 text-right">
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-extrabold text-[11px]">
                      {g.batchCount} Batch
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
