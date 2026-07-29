const Decoration = () => {
  return (
    <div className="absolute w-full h-full -z-10">
      <div className="absolute w-[15%] aspect-[1.67/1] bg-[url(/images/corner-primary.png)] bg-contain bg-no-repeat bg-center top-0 left-0 rotate-180" />
      <div className="absolute w-[15%] aspect-[1.67/1] bg-[url(/images/corner-primary.png)] bg-contain bg-no-repeat bg-center top-0 right-0 rotate-180 rotate-y-180" />
      <div className="absolute w-[15%] aspect-[1.67/1] bg-[url(/images/corner-primary.png)] bg-contain bg-no-repeat bg-center bottom-0 left-0 rotate-y-180" />
      <div className="absolute w-[15%] aspect-[1.67/1] bg-[url(/images/corner-primary.png)] bg-contain bg-no-repeat bg-center bottom-0 right-0" />
    </div>
  );
};

export default Decoration;
