import { Address } from 'viem';

export const mockTx = {
  from: '0x420b39569bfdcbc1ac6da43988b27ce3f17b5587',
  to: '0x111111125421ca6dc452d289314280a0f8842a65',
  data: '0x07ed23790000000000000000000000005141b82f5ffda4c6fe1e372978f1c5427640a190000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000006982508145454ce325ddbe47a25d4ec3d23119330000000000000000000000005141b82f5ffda4c6fe1e372978f1c5427640a1900000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc0000000000000000000000000000000000000000000000000000000005f5e10000000000000000000000000000000000000000000007f48594b88c16f8cfdfa900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000019000000000000000000000000000000000000000000000017200009c00001a0020d6bdbf78a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800a07225b0d0a0b86991c6218b36c1d19d4a2e9eb0ce3606eb488626f6940e2eb28930efb4cef49b2d1f2c9c1199000000000000000000000000000000000000000000000000000000000016e36090cbe4bdd538d6e9b379bff5fe72c3d67a521de500000000000000000000000000000000000000000000000000000000000493e000a007e5c0d20000000000000000000000000000000000000000000000000000b200004f02a00000000000000000000000000000000000000000000000000000000000000001ee63c1e5018aee53b873176d9f938d24a53a8ae5cf36276464a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4802a00000000000000000000000000000000000000000000000000000000000000001ee63c1e58005b5dba037afa4bbafaca15bf9f6bfaaad183fe6dc035d45d973e3ec169d2276ddab16f1e407384f111111125421ca6dc452d289314280a0f8842a65000000000000000000000000000000001389cc2e',
}

export const getTradeData = async (
  srcToken: Address | string,
  dstToken: Address | string,
  amountToTrade: bigint,
  from: Address | string,
  origin: Address | string,
  receiver: Address | string,
) => {
  try {
    const baseUrl = 'https://api.1inch.dev/swap/v6.0/1/swap';
    const params = new URLSearchParams({
      src: srcToken.toString(),
      dst: dstToken.toString(),
      amount: amountToTrade.toString(),
      from: from.toString(),
      origin: origin.toString(),
      slippage: '10',
      receiver: receiver.toString(),
      disableEstimate: 'true',
      compatibility: 'true',
      allowPartialFill: 'false',
      includeProtocols: 'true',
      excludedProtocols: 'PMM15',
      referrer: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
      fee: '1.5',
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const { tx } = await response.json() as { tx: { data: string, from: string, to: string } };

    return tx;
  } catch (error: any) {
    console.error('Error fetching swap data:', error.response?.data || error.message);
  }
};
