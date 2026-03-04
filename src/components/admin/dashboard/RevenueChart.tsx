const RevenueChart = () => {
  const data = [40, 70, 50, 90, 60, 80, 65];
  const maxHeight = Math.max(...data);

  return (
    <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-200">
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900">Doanh thu theo tuần</h3>
        <p className="text-gray-500 text-sm mt-1">
          Biểu đồ doanh thu hàng tuần
        </p>
      </div>

      <div className="flex items-end justify-between gap-3 h-80 px-4 py-8 bg-gradient-to-b from-gray-50 to-white rounded-xl">
        {data.map((value, index) => {
          const days = [
            "Thứ 2",
            "Thứ 3",
            "Thứ 4",
            "Thứ 5",
            "Thứ 6",
            "Thứ 7",
            "CN",
          ];
          const heightPercent = (value / maxHeight) * 100;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div className="w-full relative flex justify-center">
                <div
                  className="w-10 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-300 hover:shadow-lg hover:from-indigo-700 hover:to-indigo-500 cursor-pointer"
                  style={{ height: `${heightPercent * 2}px` }}
                  title={`${value}%`}
                />
              </div>
              <p className="text-xs text-gray-600 font-medium">{days[index]}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex gap-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
          <span className="text-sm text-gray-600">Doanh thu</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
