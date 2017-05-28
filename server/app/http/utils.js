import serveStatic from 'serve-static';

export function promisedServeStatic(staticPath, staticOptions){
    const serve = serveStatic(staticPath, staticOptions)

    return (req,res) => {
        return new Promise((resolve,reject)=>{
            serve(req, res,resolve);
        });
    }
    
}