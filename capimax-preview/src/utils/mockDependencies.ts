// Temporary mock implementations for missing dependencies

// Mock axios
export const axios = {
  get: async (url: string) => ({ data: {} }),
  post: async (url: string, data?: any) => ({ data: {} }),
  put: async (url: string, data?: any) => ({ data: {} }),
  delete: async (url: string) => ({ data: {} }),
};

// Mock react-hook-form
export const useForm = () => ({
  register: (name: string) => ({ name }),
  handleSubmit: (fn: any) => (e: any) => { e.preventDefault(); fn({}); },
  watch: () => ({}),
  formState: { errors: {}, isSubmitting: false, isValid: true },
  reset: () => {},
  setValue: () => {},
  getValues: () => ({}),
});

// Mock zod
export const z = {
  object: (schema: any) => ({
    parse: (data: any) => data,
    safeParse: (data: any) => ({ success: true, data }),
  }),
  string: () => ({
    min: () => ({}),
    max: () => ({}),
    email: () => ({}),
    optional: () => ({}),
  }),
  number: () => ({
    min: () => ({}),
    max: () => ({}),
    optional: () => ({}),
  }),
  boolean: () => ({
    optional: () => ({}),
  }),
};

// Mock ethers
export const ethers = {
  utils: {
    formatEther: (value: any) => '0.00',
    parseEther: (value: string) => value,
  },
  providers: {
    Web3Provider: class MockWeb3Provider {},
  },
  Contract: class MockContract {},
};

// Mock wagmi/viem
export const useAccount = () => ({
  address: undefined,
  isConnected: false,
});

export const useBalance = () => ({
  data: undefined,
  isLoading: false,
});

export const useContractRead = () => ({
  data: undefined,
  isLoading: false,
});

export const useContractWrite = () => ({
  write: () => {},
  isLoading: false,
});

// Mock @tanstack/react-query
export const useQuery = () => ({
  data: undefined,
  isLoading: false,
  error: null,
});

export const QueryClient = class MockQueryClient {};
export const QueryClientProvider = ({ children }: { children: any }) => children;

// Mock recharts
export const ResponsiveContainer = ({ children }: { children: any }) => children;
export const LineChart = () => null;
export const AreaChart = () => null;
export const BarChart = () => null;
export const Line = () => null;
export const Area = () => null;
export const Bar = () => null;
export const XAxis = () => null;
export const YAxis = () => null;
export const Tooltip = () => null;
export const Legend = () => null;